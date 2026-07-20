import os
import json
import subprocess
from datetime import datetime
import sys

# Add path to import kavach_api
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'packages', 'domain')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'packages', 'config')))

from kavach_api.evaluation import run_benchmark, run_threshold_sweep
from kavach_api.routes.counterfeit import get_synthetic_evaluation
from kavach_config.settings import get_settings

def run_all_evaluations():
    print("Running Scam Detection Benchmark...")
    scam_metrics = run_benchmark()
    
    print("Running Counterfeit Screening Evaluation...")
    counterfeit_metrics = get_synthetic_evaluation()
    
    print("Running Threshold Sweep...")
    run_threshold_sweep(os.path.join(os.path.dirname(__file__), "..", "docs", "threshold_sweep.json"))
    with open(os.path.join(os.path.dirname(__file__), "..", "docs", "threshold_sweep.json"), "r") as f:
        sweep_data = json.load(f)

    print("Running tests for system validation...")
    test_result = subprocess.run(
        [".venv/Scripts/pytest.exe", "apps/api/tests/", "-v"],
        capture_output=True, text=True, cwd=os.path.join(os.path.dirname(__file__), "..")
    )

    eval_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "environment": {
            "db_url": str(get_settings().database_url),
            "version": "1.0.0"
        },
        "scam_detection": scam_metrics,
        "counterfeit_screening": counterfeit_metrics,
        "threshold_sweep_summary": sweep_data,
        "system_validation_tests_passed": test_result.returncode == 0,
        "test_output": test_result.stdout[-1500:]
    }

    eval_dir = os.path.join(os.path.dirname(__file__), "..", "data", "evaluations")
    os.makedirs(eval_dir, exist_ok=True)
    with open(os.path.join(eval_dir, "final_metrics.json"), "w") as f:
        json.dump(eval_data, f, indent=2)

    print(f"Evaluation completed. Saved to {eval_dir}/final_metrics.json")
    print(f"Tests Passed: {test_result.returncode == 0}")

if __name__ == "__main__":
    run_all_evaluations()
