import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { User } from "../database/models/user.model";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user";
}

//  Authenticate user
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return null;

    const isValid = await bcrypt.compare(
      password,
      user.getDataValue("password")
    );
    if (!isValid) return null;

    return {
      id: user.getDataValue("id"),
      username: user.getDataValue("username"),
      email: user.getDataValue("email"),
      role: user.getDataValue("role"),
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// Create user
export async function createUser(
  username: string,
  email: string,
  password: string,
  role: "admin" | "user" = "user"
) {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
    });
    return user.getDataValue("id");
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Get all users
export async function getAllUsers() {
  try {
    const users = await User.findAll({
      attributes: ["id", "username", "email", "role", "created_at"],
      order: [["created_at", "DESC"]],
    });
    return users.map((user) => user.get());
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Delete user (except admin)
export async function deleteUser(id: number) {
  try {
    await User.destroy({
      where: {
        id,
        role: { [Op.ne]: "admin" }, // Only non-admins
      },
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
}
