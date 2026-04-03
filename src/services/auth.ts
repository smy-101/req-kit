export interface AuthConfig {
  token?: string;
  username?: string;
  password?: string;
  key?: string;
  value?: string;
  in?: 'header' | 'query';
}

export interface AuthResult {
  headers: Record<string, string>;
  params: Record<string, string>;
}

export function injectAuth(
  authType: string,
  authConfig: string | AuthConfig | null | undefined,
  existingHeaders: Record<string, string>,
  existingParams: Record<string, string>
): AuthResult {
  const headers = { ...existingHeaders };
  const params = { ...existingParams };

  if (!authType || authType === 'none' || !authConfig) {
    return { headers, params };
  }

  const config: AuthConfig = typeof authConfig === 'string' ? JSON.parse(authConfig) : authConfig;

  switch (authType) {
    case 'bearer':
      if (config.token) {
        headers['Authorization'] = `Bearer ${config.token}`;
      }
      break;

    case 'basic':
      if (config.username && config.password !== undefined) {
        const encoded = btoa(`${config.username}:${config.password}`);
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;

    case 'apikey':
      if (config.key && config.value) {
        if (config.in === 'query') {
          params[config.key] = config.value;
        } else {
          headers[config.key] = config.value;
        }
      }
      break;
  }

  return { headers, params };
}
