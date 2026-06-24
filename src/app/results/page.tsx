import Link from 'next/link';

export default function ResultsPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">결과</h1>
      <p className="text-sm text-gray-600">
        추천 결과는 입력 화면에서 바로 표시됩니다.{' '}
        <Link href="/" className="text-blue-600 underline">
          입력 화면으로
        </Link>
      </p>
    </main>
  );
}
