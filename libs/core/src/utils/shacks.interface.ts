/** @format */

export interface IResponseBase {
  status: boolean;
  message: string;
}

export interface IGetTokenResponse extends IResponseBase {
  meta: {
    token: string;
  };
  data: {
    IAM: string;
    name: string;
    email: string;
    type: string;
  };
}

export interface IGetGamesResponse extends IResponseBase {
  data: {
    games: IShacksEvoGame[];
  };
}

export interface IShacksEvoGame {
  isActive: boolean;
  url: string;
  gameId: string;
  gameType: string;
  createdAt: string;
  assets: {
    logo: string;
    banner: string;
    banners: {
      size: string;
      banner: string;
    }[];
  };
}
