import auth from "@/lib/axiosAuth";

export default {
  login: (email: string, password: string) => {
    return auth.post("/users/login", { email, password });
  },

  auth: () => {
    const token = localStorage.getItem("AUTH_TOKEN");
    return auth.get("/users/user", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });
  },

  registerUser(userData) {
    return auth.post("/users/register", userData);
  },

  inviteUser(userData) {
    return auth.post("/users/invite", userData);
  },

  verifyAccount(token) {
    return auth.get(`/users/verify/${token}`);
  },

  forgotPassword(data) {
    return auth.post(`/users/forgot-password`, data);
  },

  verifyToken(token) {
    return auth.get(`/users/forgot-password/${token}`);
  },

  updatePassword(token, data) {
    return auth.post(`/users/forgot-password/${token}`, data);
  },

  getUsersByProveedorId(idProveedorSalud) {
    return auth.get(`/users/get-users/${idProveedorSalud}`);
  },

  removeUserByEmail(email) {
    return auth.delete(`/users/delete-user/${email}`);
  },
};
