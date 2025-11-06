import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface UserData {
  id: string;
  username: string;
  email: string;
}

@Injectable()
export class UsersService {
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  async getUsersByIds(userIds: string[]): Promise<Map<string, UserData>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    const userMap = new Map<string, UserData>();

    // Fetch users in parallel
    const promises = userIds.map((id) =>
      this.getUserById(id)
        .then((user) => {
          if (user) userMap.set(id, user);
        })
        .catch(() => {
          // If user not found, just skip
        })
    );

    await Promise.allSettled(promises);
    return userMap;
  }

  private async getUserById(userId: string): Promise<UserData | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/users/${userId}`)
      );
      return response.data;
    } catch {
      return null;
    }
  }
}
