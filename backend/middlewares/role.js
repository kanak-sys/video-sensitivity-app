/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of roles that are allowed
 */
module.exports = (allowedRoles = []) => {
  return (req, res, next) => {
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Check if user has a role
    if (!req.user.role) {
      console.error("User has no role assigned:", req.user.userId);
      return res.status(403).json({
        success: false,
        message: "User role not defined"
      });
    }

    // Check if role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`Access denied for role ${req.user.role}. Allowed: ${allowedRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};