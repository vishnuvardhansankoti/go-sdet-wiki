# Go SDET Wiki

Software Development Engineer in Test (SDET) documentation and resources for Go projects.

## Setup

Use a local virtual environment so pinned versions in `requirements.txt` are always used.

1. Create and activate venv (PowerShell):

	```powershell
	python -m venv .venv
	.\.venv\Scripts\Activate.ps1
	```

2. Install dependencies:

	```powershell
	python -m pip install -r requirements.txt
	```

3. Build the wiki (from venv):

	```powershell
	python -m mkdocs build
	```

4. Serve locally (from venv):

	```powershell
	python -m mkdocs serve
	```

If you do not want to activate the venv, run commands directly with:

```powershell
.\.venv\Scripts\python -m mkdocs build
.\.venv\Scripts\python -m mkdocs serve
```

## Structure

- `docs/` - Documentation files
- `assets/` - Static assets (CSS, JavaScript, WASM)
- `.github/workflows/` - CI/CD workflows
