
import sys
import os
sys.path.append(os.path.join(os.getcwd(), "backend"))
from core.constants import FIXED_COST
print(f"FIXED_COST: {FIXED_COST}")
print(f"parse_resume_pdf + embed_resume: {FIXED_COST['parse_resume_pdf'] + FIXED_COST['embed_resume']}")
