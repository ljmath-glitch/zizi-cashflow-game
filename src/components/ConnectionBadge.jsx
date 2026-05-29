// 連線狀態小標籤（綠＝已連線、紅＝未連線）
export default function ConnectionBadge({ connected }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
        (connected
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700')
      }
    >
      <span
        className={
          'h-2 w-2 rounded-full ' +
          (connected ? 'bg-green-500' : 'bg-red-500')
        }
      />
      {connected ? '已連線' : '連線中…'}
    </span>
  );
}
