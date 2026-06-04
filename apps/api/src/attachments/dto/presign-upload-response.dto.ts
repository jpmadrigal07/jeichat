export type PresignUploadResponseDto = {
  attachmentId: string;
  uploadUrl: string;
  key: string;
};

export type DownloadUrlResponseDto = {
  url: string;
  filename: string;
  contentType: string;
};
