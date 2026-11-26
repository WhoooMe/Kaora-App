from app.runtime import model_runtime

status = model_runtime.get_status()

print("=" * 65)
print("KAORA - MODEL RUNTIME CHECK")
print("=" * 65)

for key, value in status.items():
    print(f"{key}: {value}")

print("=" * 65)

assert status["ready_for_calibration"], (
    "Cocoa Verifier belum berhasil dimuat."
)

assert status["ready_for_detection"], (
    "Maturity Classifier belum berhasil dimuat."
)

print("MODEL INTEGRATION: PASSED")
