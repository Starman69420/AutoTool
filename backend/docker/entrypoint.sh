#!/bin/bash

# This script executes test scripts and captures their output

set -e

# Create output directory
mkdir -p /workspace/output

# If a script file is provided as an argument, run it
if [ -n "$SCRIPT_PATH" ] && [ -f "$SCRIPT_PATH" ]; then
  echo "=== Running test script: $SCRIPT_PATH ==="
  echo "=== Start time: $(date) ==="
  
  # Make script executable
  chmod +x "$SCRIPT_PATH"
  
  # Execute the script as testuser and capture output and exit code
  {
    # Run script with timing information
    time sudo -u testuser "$SCRIPT_PATH" 2>&1
    SCRIPT_EXIT_CODE=$?
    
    echo ""
    echo "=== End time: $(date) ==="
    echo "=== Exit code: $SCRIPT_EXIT_CODE ==="
  } | tee /workspace/output/script_output.log
  
  # Exit with the same code as the script
  exit $SCRIPT_EXIT_CODE
else
  echo "No script file provided or file does not exist."
  echo "Set SCRIPT_PATH environment variable to the path of your script."
  echo "Entering sleep mode for debugging. Use 'docker exec' to interact."
  
  # Sleep indefinitely to keep container running for debugging
  tail -f /dev/null
fi