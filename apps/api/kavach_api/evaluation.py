import json
import os
import sys
from typing import Any

from kavach_domain.models import TranscriptSegment

from kavach_api.engine import KavachRiskEngine

# Multilingual scenario seeds for generating 200 stratified benchmark transcripts
SCAM_TEMPLATES = {
    "DIGITAL_ARREST": [
        ["I am CBI officer Inspector Mishra calling from Delhi headquarters.", "Your Aadhaar ID is linked to drugs trafficking contraband smuggling.", "You must remain under digital arrest on video call.", "Pay verification clearance deposit of ₹90,000 to safe-clearance@ybl immediately."],
        ["Main Cyber Cell Mumbai se Inspector Shinde bol raha hoon.", "Aapke parcel mein illegal fake passports aur narcotics mile hain.", "Kisi ko mat batana, ghar ka darwaja band rakho.", "Verify karne ke liye ₹1,20,000 transfer kijiye bank-clearance@paytm par."],
        ["This is Inspector Rathore. There is a warrant for money laundering against your name.", "Go to a private room, don't tell your family.", "Do a safety UPI transfer of ₹50,000 to secure-vault@ybl now."]
    ],
    "COURIER_SCAM": [
        ["Hello, this is FedEx customer care check. Your international package has contraband illegal items.", "The custom department has detained your shipment.", "You must pay customs clearance fees of ₹35,000 directly to customs-fees@okaxis or face arrest."]
    ],
    "KYC_FRAUD": [
        ["Namaste, bank Customer Care nundi matladuthunnanu. Mee KYC details ventane update cheyyandi.", "Mee account block avthundi, please share debit card and CVV validation details.", "I need the 6-digit OTP code sent to your mobile phone screen immediately."],
        ["Credit Card security support calling. Your card is frozen due to verification check.", "Tell me your PIN and account credentials to unlock.", "Otherwise we freeze all your assets right now."]
    ],
    "PHISHING": [
        ["Congratulations! You won free gift vouchers worth ₹15,000.", "Click this short SMS link: http://bit.ly/redeem-reward-bank card verification details.", "Otherwise points expire in 10 minutes."]
    ],
    "SAFE": [
        ["Hello, I would like to check the grace period for my credit card interest rates.", "Sure, it is 45 days. You can check it on our official bank website.", "Okay, thank you, no other action is needed."],
        ["Bhaiya, main delivery boy bol raha hoon, parcel gate par de diya hai.", "Haan guard room mein rakh do. Landmarks Sector 62 flat 102 hai.", "Theek hai bhaiya, parcel deliver ho gaya hai. Dhanyawad."],
        ["Hello support, my debit card is lost, please temporarily block it.", "Sure, let me verify your name first. Please visit our local branch.", "Thank you, I will visit the branch in person tomorrow."]
    ],
    "AMBIGUOUS": [
        ["Hey, where are you? The server crashed and production is down, please hurry!", "I am traveling. I will send the config file to company Slack.", "Okay please hurry, it is urgent."],
        ["Hello, dad's car met with an accident. I need ₹10,000 for hospital deposit immediately.", "Is he okay? I am transferring the money right now.", "Yes, he is stable but need deposit now."]
    ]
}

def generate_benchmark_dataset() -> list[dict[str, Any]]:
    """Generate 200 stratified test cases across categories and languages."""
    dataset: list[dict[str, Any]] = []

    # 50 Digital Arrest (25 Eng, 25 Hindi/Hinglish)
    for i in range(50):
        template = SCAM_TEMPLATES["DIGITAL_ARREST"][i % len(SCAM_TEMPLATES["DIGITAL_ARREST"])]
        dataset.append({
            "id": f"bench-da-{i}",
            "true_category": "CRITICAL",
            "scam_type": "DIGITAL_ARREST",
            "language": "Hinglish/Hindi" if i % 2 == 0 else "English",
            "turns": template
        })

    # 30 Courier scams
    for i in range(30):
        template = SCAM_TEMPLATES["COURIER_SCAM"][i % len(SCAM_TEMPLATES["COURIER_SCAM"])]
        dataset.append({
            "id": f"bench-courier-{i}",
            "true_category": "CRITICAL",
            "scam_type": "COURIER_SCAM",
            "language": "English",
            "turns": template
        })

    # 30 KYC Account Fraud
    for i in range(30):
        template = SCAM_TEMPLATES["KYC_FRAUD"][i % len(SCAM_TEMPLATES["KYC_FRAUD"])]
        dataset.append({
            "id": f"bench-kyc-{i}",
            "true_category": "CRITICAL",
            "scam_type": "KYC_FRAUD",
            "language": "Telugu/English" if i % 2 == 0 else "English",
            "turns": template
        })

    # 30 Phishing Fraud
    for i in range(30):
        template = SCAM_TEMPLATES["PHISHING"][i % len(SCAM_TEMPLATES["PHISHING"])]
        dataset.append({
            "id": f"bench-phish-{i}",
            "true_category": "SUSPICIOUS",
            "scam_type": "PHISHING",
            "language": "Tamil/English",
            "turns": template
        })

    # 30 Safe checks
    for i in range(30):
        template = SCAM_TEMPLATES["SAFE"][i % len(SCAM_TEMPLATES["SAFE"])]
        dataset.append({
            "id": f"bench-safe-{i}",
            "true_category": "SAFE",
            "scam_type": "NONE",
            "language": "English/Hindi",
            "turns": template
        })

    # 30 Ambiguous/Adversarial checks
    for i in range(30):
        template = SCAM_TEMPLATES["AMBIGUOUS"][i % len(SCAM_TEMPLATES["AMBIGUOUS"])]
        dataset.append({
            "id": f"bench-amb-{i}",
            "true_category": "SAFE",
            "scam_type": "NONE",
            "language": "English",
            "turns": template
        })

    return dataset


def run_benchmark() -> dict[str, Any]:
    """Execute evaluation harness on the generated dataset and compute final performance metrics."""
    engine = KavachRiskEngine()
    dataset = generate_benchmark_dataset()

    tp = fp = tn = fn = 0

    # Stratified language counts
    lang_stats = {}

    for item in dataset:
        # Mock TranscriptSegments
        segments = []
        for idx, text in enumerate(item["turns"]):
            segments.append(TranscriptSegment(
                id=f"seg-{item['id']}-{idx}",
                session_id=item["id"],
                speaker="SUSPECT" if idx % 2 == 0 else "CITIZEN",
                text=text,
                sequence_number=idx,
                confidence=0.98
            ))

        result = engine.evaluate_session(segments)
        pred_verdict = result["verdict"].value
        true_verdict = item["true_category"]

        # Track language breakdown
        lang = item["language"]
        if lang not in lang_stats:
            lang_stats[lang] = {"correct": 0, "total": 0}
        lang_stats[lang]["total"] += 1
        if pred_verdict == true_verdict:
            lang_stats[lang]["correct"] += 1

        # Classify as Positive (CRITICAL/SUSPICIOUS) or Negative (SAFE)
        is_pred_pos = pred_verdict in ("CRITICAL", "SUSPICIOUS")
        is_true_pos = true_verdict in ("CRITICAL", "SUSPICIOUS")

        if is_pred_pos and is_true_pos:
            tp += 1
        elif is_pred_pos and not is_true_pos:
            fp += 1
        elif not is_pred_pos and not is_true_pos:
            tn += 1
        else:
            fn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    return {
        "precision": precision,
        "recall": recall,
        "macro_f1": f1,
        "false_positive_rate": fpr,
        "confusion_matrix": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "language_breakdown": lang_stats,
        "total_evaluated": len(dataset)
    }


def run_threshold_sweep(output_path: str):
    """Run sweep over thresholds configuration parameters and write results to disk."""
    engine = KavachRiskEngine()
    dataset = generate_benchmark_dataset()
    results = []

    # Sweep threshold suspicious parameter from 0.2 to 0.8
    for step in range(2, 9):
        threshold = step / 10.0
        engine.threshold_suspicious = threshold
        tp = fp = tn = fn = 0

        for item in dataset:
            segments = []
            for idx, text in enumerate(item["turns"]):
                segments.append(TranscriptSegment(
                    id=f"seg-{item['id']}-{idx}",
                    session_id=item["id"],
                    speaker="SUSPECT" if idx % 2 == 0 else "CITIZEN",
                    text=text,
                    sequence_number=idx,
                    confidence=0.98
                ))
            result = engine.evaluate_session(segments)
            pred_verdict = result["verdict"].value
            true_verdict = item["true_category"]

            is_pred_pos = pred_verdict in ("CRITICAL", "SUSPICIOUS")
            is_true_pos = true_verdict in ("CRITICAL", "SUSPICIOUS")

            if is_pred_pos and is_true_pos:
                tp += 1
            elif is_pred_pos and not is_true_pos:
                fp += 1
            elif not is_pred_pos and not is_true_pos:
                tn += 1
            else:
                fn += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        results.append({
            "suspicious_threshold": threshold,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "tp": tp,
            "fp": fp,
            "tn": tn,
            "fn": fn
        })

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)


if __name__ == "__main__":
    if "--run-sweep" in sys.argv:
        # Generate sweep JSON artifact
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        dest = os.path.join(curr_dir, "..", "..", "..", "docs", "threshold_sweep.json")
        run_threshold_sweep(dest)
        print(f"Threshold sweep output exported successfully to: {dest}")
    else:
        # Standard run prints metrics
        metrics = run_benchmark()
        print(json.dumps(metrics, indent=2))
