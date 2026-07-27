const supabase = require('../services/supabaseClient');

async function authenticateUser(req, _res, next) {
  try {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      const error = new Error('로그인이 필요합니다');
      error.status = 401;
      throw error;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      const authError = new Error('로그인 세션이 유효하지 않습니다');
      authError.status = 401;
      throw authError;
    }
    if (req.params.id && req.params.id !== data.user.id) {
      const forbidden = new Error('다른 사용자의 정보에는 접근할 수 없습니다');
      forbidden.status = 403;
      throw forbidden;
    }

    req.user = data.user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticateUser;
