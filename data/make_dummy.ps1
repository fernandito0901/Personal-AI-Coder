# create tiny smoke set

$droot = "data"
New-Item -ItemType Directory -Force -Path "$droot/task_to_patch" | Out-Null
New-Item -ItemType Directory -Force -Path "$droot/error_to_fix" | Out-Null
New-Item -ItemType Directory -Force -Path "$droot/api_usage" | Out-Null
New-Item -ItemType Directory -Force -Path "$droot/prefs" | Out-Null

@'
{"prompt": "Implement add(a,b) correctly", "diff": ""}
{"prompt": "Fix NameError in app", "diff": ""}
{"prompt": "Write a simple function and a test", "diff": ""}
'@ | Out-File -Encoding utf8 "$droot/task_to_patch/smoke.jsonl"

@'
{"stack": "Traceback: NameError: name foo is not defined", "patch": ""}
{"stack": "Traceback: AttributeError: 'NoneType' object has no attribute 'x'", "patch": ""}
'@ | Out-File -Encoding utf8 "$droot/error_to_fix/smoke.jsonl"

@'
{"doc": "requests.get example", "code": "import requests; requests.get('https://example.com')"}
{"doc": "json usage", "code": "import json; json.dumps({'a':1})"}
'@ | Out-File -Encoding utf8 "$droot/api_usage/smoke.jsonl"

@'
{"chosen": "Write a unit test first, then implement minimal code", "rejected": "Edit random files until tests pass"}
{"chosen": "Limit patch scope to affected files", "rejected": "Rewrite the whole repo"}
'@ | Out-File -Encoding utf8 "$droot/prefs/dpo_pairs.jsonl"

