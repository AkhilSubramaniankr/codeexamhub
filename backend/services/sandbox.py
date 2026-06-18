import base64
import json
import logging
import os
import subprocess
import sys
import tempfile
import time
import uuid
from typing import List, Dict, Any, Optional

import docker
from models import TestCase
from schemas import TestCaseResultResponse

logger = logging.getLogger(__name__)

# Sandbox constraints
TIMEOUT_SECONDS = 5.0
MEMORY_LIMIT_MB = 128
CPU_LIMIT = 0.5  # 50% of 1 core

def generate_harness_code(student_code: str, entry_point: str, test_input_json: str) -> str:
    """Generates a wrapper script that embeds the student code and test case, calls it, and returns JSON output."""
    # Standard python template to run the student code
    return f"""
import sys
import json
import traceback

# 1. Student code:
{student_code}

# 2. Test Execution Harness:
if __name__ == "__main__":
    try:
        # Input parameters are JSON array of arguments
        raw_input = {repr(test_input_json)}
        if not raw_input.strip():
            args = []
        else:
            args = json.loads(raw_input)
            if not isinstance(args, list):
                args = [args]
                
        # Locate the entry point function
        entry_func = globals().get("{entry_point}")
        if not entry_func:
            print("CRASH: Function '{entry_point}' not found in student code.", file=sys.stderr)
            sys.exit(1)
            
        # Execute the function
        result = entry_func(*args)
        
        # Output result to stdout
        print(json.dumps(result))
    except Exception as e:
        print("CRASH:" + traceback.format_exc(), file=sys.stderr)
        sys.exit(1)
"""

def run_in_docker(harness_code: str) -> Dict[str, Any]:
    """Executes the harness code in a secure sandboxed Docker container."""
    client = docker.from_env()
    
    # Base64 encode the harness code to avoid escaping issues in CLI
    b64_code = base64.b64encode(harness_code.encode("utf-8")).decode("utf-8")
    cmd = ["python", "-c", f"import base64; exec(base64.b64decode('{b64_code}').decode('utf-8'))"]
    
    container = None
    try:
        # Create container with security controls
        container = client.containers.create(
            image="python:3.12-slim",
            command=cmd,
            network_disabled=True,
            mem_limit=f"{MEMORY_LIMIT_MB}m",
            nano_cpus=int(CPU_LIMIT * 1e9),
            read_only=True,
            stdout=True,
            stderr=True
        )
        
        start_time = time.time()
        container.start()
        
        # Poll for completion with timeout
        status = None
        while time.time() - start_time < TIMEOUT_SECONDS:
            container.reload()
            if container.status == "exited":
                status = container.wait()
                break
            time.sleep(0.1)
            
        container.reload()
        if container.status != "exited":
            # Timeout exceeded, kill container
            try:
                container.kill()
            except Exception:
                pass
            return {
                "stdout": "",
                "stderr": "TIMEOUT: Code execution exceeded limit of 5.0 seconds.",
                "exit_code": 137,
                "time_taken": TIMEOUT_SECONDS
            }
            
        time_taken = time.time() - start_time
        logs_stdout = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
        logs_stderr = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")
        
        exit_code = status.get("StatusCode", 0) if status else 0
        
        return {
            "stdout": logs_stdout.strip(),
            "stderr": logs_stderr.strip(),
            "exit_code": exit_code,
            "time_taken": time_taken
        }
        
    finally:
        if container:
            try:
                container.remove(force=True)
            except Exception:
                pass

def run_in_subprocess(harness_code: str) -> Dict[str, Any]:
    """Fallback runner executing code in a local subprocess if Docker is unavailable."""
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as temp_file:
        temp_file.write(harness_code)
        temp_path = temp_file.name
        
    try:
        start_time = time.time()
        # Execute python process
        res = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS
        )
        time_taken = time.time() - start_time
        return {
            "stdout": res.stdout.strip(),
            "stderr": res.stderr.strip(),
            "exit_code": res.returncode,
            "time_taken": time_taken
        }
    except subprocess.TimeoutExpired:
        return {
            "stdout": "",
            "stderr": "TIMEOUT: Code execution exceeded limit of 5.0 seconds.",
            "exit_code": 137,
            "time_taken": TIMEOUT_SECONDS
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"RUNNER EXCEPTION: {str(e)}",
            "exit_code": 1,
            "time_taken": 0.0
        }
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass

async def execute_test_cases(
    student_code: str,
    entry_point: str,
    test_cases: List[TestCase]
) -> List[TestCaseResultResponse]:
    """Runs the student code against a list of test cases and returns results."""
    results = []
    
    # Check if docker is available
    use_docker = True
    try:
        docker.from_env().ping()
    except Exception:
        use_docker = False
        logger.warning("Docker daemon not reachable. Falling back to local subprocess execution.")
        
    for tc in test_cases:
        harness_code = generate_harness_code(student_code, entry_point, tc.input)
        
        if use_docker:
            try:
                exec_res = run_in_docker(harness_code)
            except Exception as e:
                logger.error(f"Docker execution failed, falling back to subprocess. Error: {str(e)}")
                exec_res = run_in_subprocess(harness_code)
        else:
            exec_res = run_in_subprocess(harness_code)
            
        stdout = exec_res["stdout"]
        stderr = exec_res["stderr"]
        exit_code = exec_res["exit_code"]
        time_taken = exec_res["time_taken"]
        
        passed = False
        actual_output = None
        error_msg = None
        
        if exit_code == 0:
            try:
                # The harness outputs json to stdout
                actual_output = stdout.strip()
                # Parse expected and actual to compare them structurally (ignoring whitespace)
                expected_parsed = json.loads(tc.expected_output)
                actual_parsed = json.loads(actual_output)
                
                # Check for equivalence
                passed = (expected_parsed == actual_parsed)
            except Exception as e:
                passed = False
                error_msg = f"Failed to parse output: {str(e)}. Stdout was: {stdout}"
        else:
            error_msg = stderr if stderr else f"Process exited with code {exit_code}"
            
        results.append(
            TestCaseResultResponse(
                test_case_id=tc.id,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output=actual_output,
                stdout=stdout if exit_code == 0 else None,
                error=error_msg,
                passed=passed,
                is_hidden=tc.is_hidden,
                time_taken_seconds=round(time_taken, 3)
            )
        )
        
    return results
