// 请求记录解析、序列化、KV 转换

export function parseRequestRecord(record) {
  const headers = record.headers ? JSON.parse(record.headers) : {};
  const params = record.params ? JSON.parse(record.params) : {};
  const authConfig = record.auth_config
    ? (typeof record.auth_config === 'string' ? JSON.parse(record.auth_config) : record.auth_config)
    : {};

  const headerRows = Object.entries(headers).map(([key, value]) => ({ key, value, enabled: true }));
  const paramRows = Object.entries(params).map(([key, value]) => ({ key, value, enabled: true }));
  if (headerRows.length === 0) headerRows.push({ key: '', value: '', enabled: true });
  if (paramRows.length === 0) paramRows.push({ key: '', value: '', enabled: true });

  const tabData = {
    method: record.method || 'GET',
    url: record.url || '',
    headers: headerRows,
    params: paramRows,
    body: record.body || '',
    bodyType: record.body_type || 'json',
    authType: record.auth_type || 'none',
    authConfig,
    preRequestScript: record.pre_request_script || '',
    postResponseScript: record.post_response_script || '',
  };

  if (record.id != null) tabData.requestId = record.id;
  if (record.collection_id != null) tabData.collectionId = record.collection_id;
  if (record.history_id != null) tabData.historyId = record.history_id;

  // 解析特殊 body 类型
  if (record.body_type === 'multipart' && record.body) {
    try {
      const parsed = JSON.parse(record.body);
      tabData.multipartParts = parsed.parts || [{ key: '', type: 'text', value: '' }];
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse multipart body:', e); }
  } else if (record.body_type === 'binary' && record.body) {
    try {
      const parsed = JSON.parse(record.body);
      tabData.binaryFile = { data: parsed.data, filename: parsed.filename, contentType: parsed.contentType };
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse binary body:', e); }
  } else if (record.body_type === 'graphql' && record.body) {
    try {
      const parsed = JSON.parse(record.body);
      tabData.graphqlQuery = parsed.query || '';
      tabData.graphqlVariables = parsed.variables || '';
      tabData.graphqlOperationName = parsed.operationName || '';
      tabData.body = '';
    } catch (e) { console.warn('Failed to parse graphql body:', e); }
  }

  return tabData;
}

export function serializeRequestBody(tab) {
  if (tab.bodyType === 'multipart') {
    return JSON.stringify({ parts: tab.multipartParts || [] });
  }
  if (tab.bodyType === 'binary' && tab.binaryFile) {
    return JSON.stringify(tab.binaryFile);
  }
  if (tab.bodyType === 'graphql') {
    const obj = { query: tab.graphqlQuery || '' };
    if (tab.graphqlVariables?.trim()) obj.variables = tab.graphqlVariables.trim();
    if (tab.graphqlOperationName?.trim()) obj.operationName = tab.graphqlOperationName.trim();
    return JSON.stringify(obj);
  }
  return tab.body;
}

export function kvToArray(rows) {
  const obj = {};
  for (const r of rows) {
    if (r.enabled && r.key) obj[r.key] = r.value;
  }
  return obj;
}
