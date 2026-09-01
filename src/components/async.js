// Promise-based fetch
export const fetchUserData = () => {
  return fetch('https://jsonplaceholder.typicode.com/users/1')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return response.json()
    })
    .catch((error) => {
      console.error('Something went wrong', error)
      throw error
    })
}

// Async/await fetch
export const fetchUserDataAsync = async () => {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1')

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Something went wrong', error)
    throw error
  }
}

export default {
  fetchUserData,
  fetchUserDataAsync,
}
