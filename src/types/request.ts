export interface MultipartPart {
  key: string;
  type: 'text' | 'file';
  value: string;
  filename?: string;
  contentType?: string;
}

export interface MultipartBody {
  parts: MultipartPart[];
}

export interface BinaryBody {
  data: string;
  contentType?: string;
}
