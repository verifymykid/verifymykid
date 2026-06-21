import bcrypt

hash_to_check = b"$2b$12$Q4BBrfoNGPk.pFm3DvHvB.UmZdA16LyPZra8eD2EYGdAckVH9YQG6"

candidates = [
    "admin123",
    "password123",
    "admin123 ",
    " admin123",
    "Admin123",
    "ADMIN123",
    "admin",
    "password",
    "Joena joe",
    "Joenajoe",
    "GDN-D0F",
    "gdn-d0f",
    "verifymykid",
    "verifymykid123",
    "123456",
    "12345678",
    "Joena",
    "joe"
]

# Let's add client-side SHA256-hashed versions as candidates too
def js_hash(password):
    h = 0
    for c in password:
        h = (h << 5) - h + ord(c)
        h = (h + 2**31) % 2**32 - 2**31
    return f"SHA256-{hex(abs(h))[2:]}"

extra_candidates = []
for cand in candidates:
    extra_candidates.append(js_hash(cand))
candidates.extend(extra_candidates)

print("Checking candidates...")
found = False
for cand in candidates:
    if bcrypt.checkpw(cand.encode('utf-8'), hash_to_check):
        print(f"MATCH FOUND: '{cand}'")
        found = True
        break

if not found:
    print("No match found in candidates list.")
