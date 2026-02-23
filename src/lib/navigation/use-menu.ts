"use client";

import { useEffect, useState } from "react";
import { requestHal } from "@/lib/hal-client";
import {
	resolveMenu,
	type MenuAudience,
	type MenuItem,
	type MenuName,
} from "@/lib/navigation/menu-registry";

type NavContextResponse = {
	audience?: MenuAudience;
};

export const useMenu = (name: MenuName): readonly MenuItem[] => {
	const [audience, setAudience] = useState<MenuAudience | null>(null);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			const context = await requestHal<NavContextResponse>("/api/v1/nav/context");
			if (cancelled) {
				return;
			}

			if (!context.ok) {
				setAudience("guest");
				return;
			}

			setAudience(context.data.audience ?? "guest");
		};

		void load();

		return () => {
			cancelled = true;
		};
	}, []);

	if (audience === null) {
		return resolveMenu(name, "guest").filter((item) => !item.audience);
	}

	return resolveMenu(name, audience);
};
