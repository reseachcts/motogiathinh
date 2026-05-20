export const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

export const MONTHS_VI = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

export const STATUS_COLORS: Record<string, string> = {
  pending:   '#f5a623',
  active:    '#52c41a',
  suspended: '#ff4d4f',
  completed: '#1677ff',
  dropped:   '#8c8c8c',
}

export const STATUS_LABELS: Record<string, string> = {
  pending:   'Chờ duyệt',
  active:    'Đang học',
  suspended: 'Tạm dừng',
  completed: 'Hoàn thành',
  dropped:   'Nghỉ học',
}
