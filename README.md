# CodeExamHub

A modern, production-ready Online Coding Exam Portal inspired by HackerRank, LeetCode, CodeSignal, and Google Interview platforms.

The platform enables organizations, colleges, and training institutes to conduct coding assessments with built-in IDE support, automated evaluation, AI-powered grading, and secure exam management.

---

# Project Vision

Build a scalable coding examination platform where students can:

* Login using Email Magic Links
* Take coding exams in a professional IDE
* Run code against test cases
* Submit solutions before or after timer expiration
* Receive automated scoring and AI-powered feedback

Administrators can:

* Manage students
* Create exams
* Upload questions
* Analyze performance
* Review submissions

---

# Repository

Repository URL:

https://github.com/AkhilSubramaniankr/codeexamhub

Project Name:

CodeExamHub

---

# Technology Stack

## Frontend

* Next.js 14+ (App Router)
* TypeScript
* TailwindCSS
* shadcn/ui
* Monaco Editor
* React Hook Form
* Zod
* TanStack Query
* Socket.IO Client

## Backend

* FastAPI (Python 3.12+)
* SQLAlchemy
* Pydantic
* Celery (Background Jobs)
* Redis

## Databases

### PostgreSQL

Used for:

* Users
* Exams
* Questions Metadata
* Scores
* Exam Assignments

### MongoDB

Used for:

* Code Submissions
* Code Snapshots
* AI Evaluation Reports
* Execution Logs

## Authentication

* Auth.js (NextAuth)
* Email Magic Links
* JWT Sessions

## Code Execution

Preferred:

* Docker Sandboxed Runner

Alternative:

* Judge0 API

## AI Evaluation

Supported Providers:

* OpenAI GPT-4o
* Claude
* Grok

## DevOps

* Docker
* Docker Compose
* GitHub Actions
* Nginx
* Kubernetes (Future)

---

# Core Features

## Student Authentication

* Email Magic Link Login
* No passwords
* One active exam per student
* Secure session handling

---

## Student Exam Experience

Modern IDE experience inspired by:

* VS Code
* HackerRank
* LeetCode
* Google Colab

Layout:

### Left Panel

* Question Statement
* Constraints
* Examples
* Sample Input
* Sample Output
* Points
* Difficulty

### Center Panel

Monaco Editor

Supported Languages:

* Python
* JavaScript
* MySQL
* MongoDB

Features:

* Syntax Highlighting
* Auto Save
* Keyboard Shortcuts
* Theme Support

### Right Panel

* Test Runner
* Output Console
* Visible Test Cases
* Submission Status

---

## Timer System

Features:

* Real-time countdown
* Auto-save every 30 seconds
* Warning notifications
* Auto-submit on expiry
* Lock exam after submission

---

## Question Types

### Python Coding Problems

Includes:

* Function Signature
* Constraints
* Sample Tests
* Hidden Tests

### MySQL Problems

Includes:

* Schema
* Seed Data
* Expected Result

### MongoDB Problems

Includes:

* Collections
* Sample Documents
* Query Expectations

### Mixed Questions

Combination of multiple technologies.

---

## Test Case System

Each question supports:

* Visible Test Cases
* Hidden Test Cases

Recommended:

* 3 Visible
* 7 Hidden

Evaluation:

* Exact Match
* Trimmed Match
* Edge Case Validation

---

## Auto Evaluation

### Python

* Execute in Docker Sandbox
* Capture stdout
* Compare outputs
* Calculate score

### SQL

* Create temporary database
* Execute query
* Compare result set

### MongoDB

* Create temporary collection
* Execute query
* Compare results

---

## AI Evaluation

After automatic scoring:

LLM evaluates:

* Code Quality
* Readability
* Efficiency
* Edge Cases
* Partial Correctness

Returns:

* AI Score
* Feedback
* Improvement Suggestions

AI score can optionally contribute to final grade.

---

## Security

Mandatory:

* Docker Sandbox Isolation
* Resource Limits
* CPU Limits
* Memory Limits
* Network Restrictions

Optional:

* Full Screen Enforcement
* Tab Switching Detection
* Copy Paste Detection
* Webcam Monitoring

---

# Admin Dashboard

## User Management

* Create Students
* Import CSV
* Assign Exams

## Question Management

Create Questions

Fields:

* Title
* Description
* Constraints
* Language Type
* Difficulty
* Points
* Hidden Tests
* Visible Tests

Support:

* Manual Entry
* CSV Upload

## Exam Management

* Create Exams
* Assign Students
* Set Duration
* Schedule Start Time
* Schedule End Time

## Analytics

* Pass Rate
* Average Score
* Leaderboard
* Completion Rate
* Question Difficulty Analysis

---

# MVP Scope (Build First)

The MVP must be completed before advanced features.

## Phase 1

Authentication

* Email Magic Link Login

Student Dashboard

* Assigned Exams
* Start Exam

Exam Interface

* Monaco Editor
* Python Support

Evaluation

* Python Runner
* Test Cases

Exam Controls

* Timer
* Auto Save
* Auto Submit

Results

* Score Page

Goal:

A complete working coding assessment platform for Python.

---

# Phase 2

Admin Dashboard

* Question Management
* Exam Creation
* Student Assignment

---

# Phase 3

Database Questions

* MySQL Runner
* MongoDB Runner

---

# Phase 4

AI Features

* GPT Evaluation
* Claude Evaluation
* Grok Evaluation

---

# Phase 5

Enterprise Features

* Anti Cheating
* Analytics
* Monitoring
* Kubernetes Deployment

---

# Suggested Folder Structure

codeexamhub/

├── frontend/

├── backend/

├── docker/

├── docs/

├── scripts/

├── infra/

├── .github/

│

├── docker-compose.yml

├── README.md

└── .env.example

---

# Required Deliverables

Generate:

1. Complete Folder Structure

2. Database Schemas

3. API Specifications

4. Frontend Components

5. Backend Services

6. Docker Setup

7. Environment Variables

8. Authentication Flow

9. Code Execution Service

10. Test Runner

11. Evaluation Service

12. Admin Dashboard

13. CI/CD Setup

14. Deployment Documentation

---

# Development Rules

Mandatory Rules:

* Use TypeScript everywhere possible
* Use App Router only
* Use shadcn/ui
* Use TailwindCSS
* Follow Clean Architecture
* Follow SOLID Principles
* Avoid placeholder code
* Keep application runnable after each milestone
* Write reusable components
* Write production-ready code
* Add comments only when necessary

---

# Agent Operating Instructions

You are my senior full-stack engineer.

Build this project incrementally and autonomously.

Execution Order:

## Step 1

Project Setup

* Frontend
* Backend
* Databases
* Docker

## Step 2

Authentication

* Magic Links
* Session Management

## Step 3

Database Design

* PostgreSQL Models
* MongoDB Collections

## Step 4

Student Experience

* Dashboard
* Exam Page
* Monaco Editor

## Step 5

Python Evaluation Engine

* Sandbox
* Test Runner
* Scoring

## Step 6

Admin Dashboard

* Questions
* Exams
* Students

## Step 7

Database Questions

* MySQL Runner
* MongoDB Runner

## Step 8

AI Evaluation

* GPT
* Claude
* Grok

## Step 9

Deployment

* CI/CD
* Docker
* Monitoring

For every phase provide:

1. Folder Structure
2. Database Schema
3. API Routes
4. UI Components
5. Docker Updates
6. Environment Variables
7. Testing Instructions

Always prioritize working code over placeholders.

Keep the project deployable at every stage.
