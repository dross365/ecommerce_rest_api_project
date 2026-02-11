function requireAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authorized" });
  }

  if (!req.user.is_admin) {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
}

export default requireAdmin;
