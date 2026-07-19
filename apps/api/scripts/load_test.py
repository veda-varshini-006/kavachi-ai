import asyncio
import time
import httpx
import random

API_URL = "http://localhost:8000/api/v1"
HEADERS = {"X-Demo-Role": "Admin"}

async def simulate_session(client):
    """Simulates creating a session and sending transcripts."""
    start = time.time()
    try:
        # Create Session
        res = await client.post(f"{API_URL}/sessions", json={
            "channel": "PHONE",
            "citizen_identifier": f"+91-99999-{random.randint(10000, 99999)}",
            "suspect_identifier": f"+1-800-{random.randint(1000000, 9999999)}"
        }, headers=HEADERS)
        
        if res.status_code != 200:
            return {"status": "error", "reason": f"session creation failed: {res.status_code}"}
        
        session_id = res.json()["id"]
        
        # Send Transcripts
        for i in range(5):
            await asyncio.sleep(random.uniform(0.1, 0.5)) # typing delay
            res = await client.post(f"{API_URL}/sessions/{session_id}/transcript", json={
                "speaker": "SUSPECT" if i % 2 == 0 else "CITIZEN",
                "text": "Hello this is CBI you must pay fine immediately." if i % 2 == 0 else "What?",
                "confidence": 0.95
            }, headers=HEADERS)
            
            if res.status_code != 200:
                return {"status": "error", "reason": f"transcript failed: {res.status_code}"}
                
        # Inject Fault randomly
        if random.random() < 0.1:
            await client.get(f"{API_URL}/dev/fault/latency", headers=HEADERS)
            
        return {"status": "success", "latency": time.time() - start}
    except Exception as e:
        return {"status": "error", "reason": str(e)}

async def run_load_test(concurrency: int = 20, iterations: int = 5):
    """Runs a simulated load test for Kavach AI."""
    print(f"Starting load test with concurrency={concurrency}, iterations={iterations}")
    async with httpx.AsyncClient(timeout=30.0) as client:
        for it in range(iterations):
            print(f"Iteration {it+1}/{iterations}...")
            tasks = [simulate_session(client) for _ in range(concurrency)]
            results = await asyncio.gather(*tasks)
            success = sum(1 for r in results if r["status"] == "success")
            print(f"  Success: {success}/{concurrency}")
            
    print("Load test completed.")

if __name__ == "__main__":
    asyncio.run(run_load_test())
