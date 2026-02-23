"use client";

import { useEffect, useState } from "react";
import { requestHal } from "@/lib/hal-client";
import {
	resolveMenuForContext,
	type MenuContext,
	type MenuItem,
	type MenuName,
} from "@/lib/navigation/menu-registry";

type NavContextResponse = {
	audience?: MenuContext["audience"];
	roles?: string[];
};

export const useMenu = (name: MenuName): readonly MenuItem[] => {
	const [context, setContext] = useState<MenuContext | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			const context = await requestHal<NavContextResponse>("/api/v1/nav/context");
			if (cancelled) {
				return;
			}

			if (!context.ok) {
				setContext({ audience: "guest", roles: [] });
				return;
			}

			setContext({
				audience: context.data.audience ?? "guest",
				roles: context.data.roles ?? [],
			});
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, []);

	if (context === null) {
		return resolveMenuForContext(name, { audience: "guest", roles: [] }).filter((item) => !item.audience);
	}

	return resolveMenuForContext(name, context);
};
