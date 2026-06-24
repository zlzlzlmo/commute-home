import Link from 'next/link';

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">동네 비교</h1>
      <p className="text-sm text-gray-600">
        결과를 받은 뒤 비교할 동네를 선택하세요.{' '}
        <Link href="/" className="text-blue-600 underline">
          입력 화면으로
        </Link>
      </p>
    </main>
  );
}
