import { body, validationResult } from "express-validator";

const registerValidationRules = [
  body("username")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters"),
  body("email")
    .trim()
    .normalizeEmail()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid"),
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 8, max: 20 })
    .withMessage("Phone number must be between 8 and 20 characters")
    .matches(/^[0-9+\-()\s]*$/)
    .withMessage("Phone number contains invalid characters"),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter"),
];

const validationHandler = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      data: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  return next();
};

export { registerValidationRules, validationHandler };
 
// Login validation (username and password)
const loginValidationRules = [
  body("username").trim().notEmpty().withMessage("Username is required"),
  body("password").trim().notEmpty().withMessage("Password is required"),
];

export { loginValidationRules };

const googleAuthValidationRules = [
  body("idToken")
    .isString()
    .withMessage("idToken must be a string")
    .trim()
    .notEmpty()
    .withMessage("idToken is required")
    .matches(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
    .withMessage("idToken must be a valid JWT format"),
];

export { googleAuthValidationRules };

