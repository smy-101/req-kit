export interface PostmanCollection {
  info: { name?: string; schema: string };
  item?: PostmanItem[];
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
}

export interface PostmanRequest {
  method?: string;
  url?: string | { raw?: string };
  header?: { key: string; value: string }[];
  body?: {
    mode?: string;
    raw?: string;
    graphql?: { query?: string; variables?: string; operationName?: string };
    formdata?: PostmanFormDataItem[];
  };
}

export interface PostmanFormDataItem {
  key: string;
  type: 'text' | 'file';
  value?: string;
  src?: string;
}

export interface PostmanVariable {
  key: string;
  value?: string;
  enabled?: boolean;
}
