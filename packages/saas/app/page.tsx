import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-6">📋</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          確定申告サポート
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          フリーランス・副業の確定申告をAIがサポート。
          書類を撮影するだけで、何をどこにどう書くかを専門用語ゼロで案内します。
        </p>
        <Link
          href="/chat"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
        >
          チャットを開始する →
        </Link>
        <p className="text-xs text-gray-400 mt-4">
          ※ 無料で3回まで試せます
        </p>
      </div>
    </main>
  );
}
