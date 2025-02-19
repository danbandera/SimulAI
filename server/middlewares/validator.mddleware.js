export const validateSchema = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: result.error.flatten().fieldErrors,
      });
    }
    next();
  } catch (error) {
    res.status(500).json(error.errors.map((error) => error.message) );
  }
};
