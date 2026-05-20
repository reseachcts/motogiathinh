import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Image, Spin, Typography, Upload } from 'antd'
import { CameraOutlined, DeleteOutlined, IdcardOutlined, UserOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { studentsApi } from '@/api/students'

const { Text } = Typography

interface ImageSlotProps {
  label: string
  icon: React.ReactNode
  url: string | null
  imageType: string
  studentId: string
  loading: boolean
  onUpload: (imageType: string, file: File) => void
  onDelete: (imageType: string) => void
}

const ImageSlot: React.FC<ImageSlotProps> = ({ label, icon, url, imageType, studentId, loading, onUpload, onDelete }) => (
  <div style={{
    background: 'var(--mgt-bg-base)',
    border: '1px solid var(--mgt-border)',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
    position: 'relative',
  }}>
    <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {icon} {label}
    </div>

    {loading ? (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin />
      </div>
    ) : url ? (
      <div>
        <Image
          src={url}
          alt={label}
          style={{ maxHeight: 120, objectFit: 'contain', borderRadius: 6 }}
          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzIxMjYyZCIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9IjAuM2VtIiBmaWxsPSIjOGI5NDllIiBmb250LXNpemU9IjEyIj5ObyBpbWFnZTwvdGV4dD48L3N2Zz4="
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center' }}>
          <Upload
            showUploadList={false}
            accept="image/jpeg,image/png,image/webp"
            beforeUpload={file => { onUpload(imageType, file); return false }}
          >
            <Button size="small" icon={<CameraOutlined />} style={{ fontSize: 11 }}>Đổi</Button>
          </Upload>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(imageType)} style={{ fontSize: 11 }}>Xóa</Button>
        </div>
      </div>
    ) : (
      <Upload
        showUploadList={false}
        accept="image/jpeg,image/png,image/webp"
        beforeUpload={file => { onUpload(imageType, file); return false }}
      >
        <div style={{
          height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', border: '1px dashed var(--mgt-border-strong)', borderRadius: 8,
          color: 'var(--mgt-text-secondary)', gap: 6,
        }}>
          <CameraOutlined style={{ fontSize: 24 }} />
          <span style={{ fontSize: 12 }}>Tải ảnh lên</span>
        </div>
      </Upload>
    )}
  </div>
)

interface Props {
  studentId: string
  portraitUrl: string | null
  cccdFrontUrl: string | null
  cccdBackUrl: string | null
}

const StudentImageSection: React.FC<Props> = ({ studentId, portraitUrl, cccdFrontUrl, cccdBackUrl }) => {
  const queryClient = useQueryClient()
  const [loadingType, setLoadingType] = React.useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: ({ imageType, file }: { imageType: string; file: File }) =>
      studentsApi.uploadImage(studentId, imageType, file),
    onSuccess: () => {
      toast.success('Tải ảnh thành công!')
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
      setLoadingType(null)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.detail ?? 'Lỗi tải ảnh')
      setLoadingType(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (imageType: string) => studentsApi.deleteImage(studentId, imageType),
    onSuccess: () => {
      toast.success('Đã xóa ảnh')
      queryClient.invalidateQueries({ queryKey: ['student', studentId] })
    },
    onError: () => toast.error('Lỗi xóa ảnh'),
  })

  const handleUpload = (imageType: string, file: File) => {
    setLoadingType(imageType)
    uploadMutation.mutate({ imageType, file })
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ color: 'var(--mgt-text-primary)', fontSize: 14, fontWeight: 600, marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.03em' }}>
        HÌNH ẢNH GIẤY TỜ
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <ImageSlot label="Ảnh thẻ" icon={<UserOutlined />} url={portraitUrl} imageType="portrait"
          studentId={studentId} loading={loadingType === 'portrait'} onUpload={handleUpload} onDelete={t => deleteMutation.mutate(t)} />
        <ImageSlot label="CCCD trước" icon={<IdcardOutlined />} url={cccdFrontUrl} imageType="cccd_front"
          studentId={studentId} loading={loadingType === 'cccd_front'} onUpload={handleUpload} onDelete={t => deleteMutation.mutate(t)} />
        <ImageSlot label="CCCD sau" icon={<IdcardOutlined />} url={cccdBackUrl} imageType="cccd_back"
          studentId={studentId} loading={loadingType === 'cccd_back'} onUpload={handleUpload} onDelete={t => deleteMutation.mutate(t)} />
      </div>
    </div>
  )
}

export default StudentImageSection
