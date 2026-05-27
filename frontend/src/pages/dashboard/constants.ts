export const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

export const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

export const STATUS_COLORS: Record<string, string> = {
  pending:   '#FFB020',
  active:    '#B6FF3C',
  suspended: '#FF3D8A',
  completed: '#00E5FF',
  dropped:   '#4E5566',
}

export const STATUS_LABELS: Record<string, string> = {
  pending:   'Chờ duyệt',
  active:    'Đang học',
  suspended: 'Tạm dừng',
  completed: 'Hoàn thành',
  dropped:   'Nghỉ học',
}
