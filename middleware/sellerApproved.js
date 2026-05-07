const sellerApproved = async (req, res, next) => {
  if (req.session.role === 'admin') {
    return next()
  }

  if (req.session.accountStatus !== 'active') {
    return res.status(403).json({ message: 'Your seller account is pending admin approval.' })
  }

  next()
}

export default sellerApproved