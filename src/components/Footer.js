export default function Footer() {
  return (
    <footer className="border-t bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
      <div className="container flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div>
          <h3 className="text-lg font-bold">Movie Z</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">© 2024 Movie Z. All Rights Reserved.</p>
        </div>
 
        <div className="text-center text-sm md:text-left">
          <p className="font-medium">Contact Information</p>
          <p className="text-gray-600 dark:text-gray-400">Email: support@moviez.com</p>
          <p className="text-gray-600 dark:text-gray-400">Phone: +976 (11) 123-4567</p>
        </div>
 
        <div className="flex gap-4 text-sm">
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Facebook</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Instagram</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Twitter</a>
          <a href="#" className="hover:underline text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Youtube</a>
        </div>
      </div>
    </footer>
  )
}