import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
      <div className="container flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div>
          <h3 className="text-lg font-extrabold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#c9a227] to-[#e7c779]">VXNTA</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">© 2025 VXNTA. All Rights Reserved.</p>
          <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-500">
            VXNTA is a movie discovery and trailer platform. We do not host or stream any films — watch movies legally in cinemas or on licensed services.
          </p>
        </div>

        <div className="text-center text-sm md:text-left">
          <p className="font-medium">Contact Information</p>
          <p className="text-gray-600 dark:text-gray-400">Email: hello@vxnta.app</p>
          <p className="text-gray-600 dark:text-gray-400">
            Phone:{" "}
            <a href="tel:+97699606540" className="hover:text-[#c9a227] dark:hover:text-amber-200">
              +976 9960 6540
            </a>
            {" · "}
            <a href="tel:+97666330876" className="hover:text-[#c9a227] dark:hover:text-amber-200">
              +976 6633 0876
            </a>
          </p>
          <p className="text-gray-600 dark:text-gray-400">Watch movies legally: support your local cinema</p>
        </div>

        <div className="flex gap-4 text-sm">
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Facebook</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Instagram</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Twitter</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Youtube</a>
          <Link href="/help" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-[#c9a227] dark:hover:text-amber-200">Тусламж</Link>
          <Link href="/admin" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-[#c9a227] dark:hover:text-amber-200">Admin</Link>
        </div>
      </div>
    </footer>
  )
}