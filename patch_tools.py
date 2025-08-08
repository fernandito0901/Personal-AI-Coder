from pathlib import Path 
p=Path('orchestrator/tools.py') 
s=p.read_text(encoding='utf-8') 
replacements={ 
'    \"url = f\"self.ollama_host}/api/chat\"':'url = f\"{self.ollama_host}/api/chat\"',>>patch_tools.py && echo '    \"ctx_parts.append(f\\\\\"Path: {path}\\n```\\ncode}\\n```\\\\\")':'ctx_parts.append(f\\\\\"Path: {path}\\n```\\n{code}\\n```\\\\\")', 
'    \"f\\\\\"Task:\\\\ntask}\\\\n\\\\n\\\\\"\":\"f\\\\\"Task:\\\\n{task}\\\\n\\\\n\\\\\"\",' 
'    \"user_msg += f\\\\\"\\\\n\\\\nTest/Run trace:\\\\ntrace}\\\\n\\\\\"\":\"user_msg += f\\\\\"\\\\n\\\\nTest/Run trace:\\\\n{trace}\\\\n\\\\\"\",' 
'    \"return f\\\\\"```path}\\\\nnew_txt}\\\\n```\\\\\"\":\"return f\\\\\"```{path}\\\\n{new_txt}\\\\n```\\\\\"\",' 
} 
for a,b in replacements.items(): 
   if a in s: 
       s=s.replace(a,b) 
p.write_text(s,encoding='utf-8') 
print('patched') 
