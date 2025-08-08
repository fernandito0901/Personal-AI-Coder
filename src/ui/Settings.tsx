import React, { useEffect, useState } from 'react'

export function Settings({ base }: { base: string }) {
  const [local, setLocal] = useState('')
  const [docker, setDocker] = useState(true)
  const [testCmd, setTestCmd] = useState('pytest -q')
  const [openai, setOpenai] = useState('')

  useEffect(() => {
    fetch(`${base}/settings`).then(r => r.json()).then(d => {
      setLocal(d.LOCAL_LLM || '')
      setDocker((d.USE_DOCKER||'true') === 'true')
      setTestCmd(d.TEST_CMD || 'pytest -q')
    })
  }, [base])

  function save() {
    fetch(`${base}/settings/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ LOCAL_LLM: local, USE_DOCKER: docker, TEST_CMD: testCmd, OPENAI_API_KEY: openai }) })
  }

  return (
    <div>
      <div>
        <label>Local model </label>
        <input value={local} onChange={e => setLocal(e.target.value)} />
      </div>
      <div>
        <label>Use Docker </label>
        <input type='checkbox' checked={docker} onChange={e => setDocker(e.target.checked)} />
      </div>
      <div>
        <label>Test command </label>
        <input value={testCmd} onChange={e => setTestCmd(e.target.value)} style={{width:300}} />
      </div>
      <div>
        <label>OpenAI API Key (stored securely) </label>
        <input value={openai} onChange={e => setOpenai(e.target.value)} type='password' />
      </div>
      <button onClick={save}>Save</button>
    </div>
  )
}
