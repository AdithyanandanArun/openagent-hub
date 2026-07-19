import api from './api';

export async function addAttachmentToKnowledge(attachmentId: string): Promise<{ id: string; status: string }> {
  const { data } = await api.post('/knowledge/attachments', { attachment_id: attachmentId });
  return data;
}
