// SSE 流解析器 — 封装 buffer 管理、行分割、event/data 字段解析
export async function parseSSEStream(reader, callbacks) {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line === '' || line.startsWith(':')) continue;
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6);
          let data;
          try { data = JSON.parse(raw); } catch { data = raw; }
          callbacks.onEvent?.(currentEvent, data);
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    callbacks.onError?.(err);
  }
}
