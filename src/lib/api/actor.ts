export type ApiActor =
  | {
      type: "USER";
      id: string;
    }
  | {
      type: "SERVICE";
      id: string | null;
    };

export const asUserActor = (id: string): ApiActor => ({ type: "USER", id });

export const fkUserId = (actor: ApiActor): string | null => (actor.type === "USER" ? actor.id : null);
