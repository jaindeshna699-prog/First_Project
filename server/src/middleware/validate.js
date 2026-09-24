export default function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.errors.map(e => e.message).join(', '));
      err.status = 400;
      throw err;
    }
    req.body = result.data;
    next();
  };
}
