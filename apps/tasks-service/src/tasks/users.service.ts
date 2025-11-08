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
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

  constructor(private readonly httpService: HttpService) {}

  async getUsersByIds(userIds: string[]): Promise<Map<string, UserData>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    console.log(`📥 getUsersByIds called with ${userIds.length} users, auth service URL: ${this.authServiceUrl}`);

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
    console.log(`📤 getUsersByIds returning map with ${userMap.size} users`);
    return userMap;
  }

  private async getUserById(userId: string): Promise<UserData | null> {
    try {
      const url = `${this.authServiceUrl}/auth/users/${userId}`;
      console.log(`🔍 Fetching user ${userId} from ${url}`);
      const response = await firstValueFrom(
        this.httpService.get(url)
      );
      console.log(`✅ Got user ${userId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch user ${userId}:`, error instanceof Error ? error.message : error);
      return null;
    }
  }
}
