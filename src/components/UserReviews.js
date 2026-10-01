"use client"

import { useState, useEffect } from "react"

const REVIEWS_KEY = "vxnta-user-reviews"

function getReviews() {
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "{}")
  } catch {
    return {}
  }
}

function saveReviews(reviews) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
}

function StarInput({ rating, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star <= rating}
          aria-label={`${star} stars`}
          onClick={() => onChange(star)}
          className={`text-lg transition-transform hover:scale-125 ${
            star <= rating ? "text-yellow-400" : "text-slate-300 dark:text-slate-600"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function RatingBar({ count, total, maxStars }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-6 text-slate-500">{maxStars}★</span>
      <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-slate-500">{total > 0 ? `${Math.round(pct)}%` : "—"}</span>
    </div>
  )
}

export default function UserReviews({ movieSlug }) {
  const [reviews, setReviews] = useState([])
  const [userRating, setUserRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const all = getReviews()
    const movieReviews = all[movieSlug] || []
    setReviews(movieReviews)
    const userRev = movieReviews.find((r) => r.userId === "guest")
    if (userRev) {
      setUserRating(userRev.rating)
    }
  }, [movieSlug])

  function handleRate(stars) {
    setUserRating(stars)
  }

  function handleSubmitReview() {
    if (userRating === 0 && !reviewText.trim()) return

    const all = getReviews()
    if (!all[movieSlug]) all[movieSlug] = []
    all[movieSlug] = all[movieSlug].filter((r) => r.userId !== "guest")

    const newReview = {
      userId: "guest",
      rating: userRating,
      review: reviewText.trim(),
      date: new Date().toLocaleDateString(),
    }
    all[movieSlug].unshift(newReview)
    saveReviews(all)

    setReviews(all[movieSlug])
    setUserRating(0)
    setReviewText("")
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const ratedReviews = reviews.filter((r) => r.rating > 0)
  const avgRating =
    ratedReviews.length > 0
      ? (ratedReviews.reduce((a, b) => a + b.rating, 0) / ratedReviews.length).toFixed(1)
      : null

  const ratingDistribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratedReviews.filter((r) => r.rating === star).length,
  }))

  return (
    <div className="animate-fade-in-up delay-300">
      <h2 className="mb-4 text-2xl font-bold">User Reviews & Ratings</h2>

      {/* Current user's rating interaction */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 text-lg font-semibold">Rate this movie</h3>
        <StarInput rating={userRating} onChange={handleRate} />
        <p className="mt-2 text-sm text-slate-500">
          {userRating > 0 ? `You rated ${userRating}/10` : "Tap stars to rate"}
        </p>

        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Write a review (optional)..."
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#d6b456] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          rows={3}
        />
        <button
          onClick={handleSubmitReview}
          disabled={!reviewText.trim() && userRating === 0}
          className="mt-3 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e7c779] px-5 py-2.5 text-sm font-bold text-[#1a150b] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitted ? "✓ Submitted!" : "Submit Review"}
        </button>
      </div>

      {/* Average rating display */}
      {avgRating && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-center">
            <div className="text-4xl font-black text-yellow-400">{avgRating}</div>
            <div className="text-sm text-slate-500">out of 10</div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{ratedReviews.length} rating{ratedReviews.length !== 1 ? "s" : ""}</p>
            <div className="mt-2 space-y-1">
              {ratingDistribution
                .filter((r) => r.count > 0)
                .slice(0, 5)
                .map(({ star, count }) => (
                  <RatingBar key={star} count={count} total={ratedReviews.length} maxStars={star} />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-slate-500">No reviews yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          reviews.map((rev, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-[#c9a227]/20 dark:text-amber-200">
                    ★
                  </div>
                  <span className="font-medium">Guest Reviewer</span>
                </div>
                <div className="flex items-center gap-2">
                  {rev.rating > 0 && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-sm font-semibold text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300">
                      {rev.rating}/10
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{rev.date}</span>
                </div>
              </div>
              {rev.review && <p className="text-sm text-slate-600 dark:text-slate-300">{rev.review}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
