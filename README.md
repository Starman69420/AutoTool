# AutoTool

A comprehensive automation tool for testing and debugging scripts across multiple server operating systems.

## Overview

AutoTool streamlines the process of creating, testing, and debugging server scripts across various operating systems. It uses Large Language Models (LLMs) to generate scripts based on requirements, tests them in containerized environments, and provides remediation suggestions for any issues encountered.

## Features

- Support for multiple server operating systems:
  - Windows Server (2009, 2012, 2016, 2022, 2025)
  - Linux distributions (RHEL, CentOS, Ubuntu, Debian, etc.)
- Markdown-based requirement specification
- LLM-powered script generation (using your own API key)
- Docker-based testing environment
- Comprehensive test reporting
- Automated remediation script generation
- User-friendly React dashboard

## Workflow

1. Create a markdown file describing your server requirements
2. Upload the file to AutoTool
3. AutoTool uses an LLM to generate a script based on your requirements
4. The script is tested in appropriate Docker containers
5. A summary report is generated showing test results
6. If issues are found, AutoTool generates remediation scripts

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Docker
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/Starman69420/AutoTool.git
cd AutoTool

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Build the frontend
npm run build

# Start the application
cd ../backend
npm start
```

## Usage

1. Access the dashboard at http://localhost:3000
2. Upload or create a requirements file
3. Enter your LLM API key
4. Select target operating systems
5. Generate and test your script
6. View test results and remediation suggestions

## License

This project is licensed under the MIT License - see the LICENSE file for details.