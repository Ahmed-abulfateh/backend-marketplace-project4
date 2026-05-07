const errorMiddleware = (error, _req, res, _next) => {
  console.error(error)

  if (res.headersSent) {
    return
  }

  res.status(500).json({
    message: error instanceof Error ? error.message : 'Internal server error.',
  })
}

export default errorMiddleware