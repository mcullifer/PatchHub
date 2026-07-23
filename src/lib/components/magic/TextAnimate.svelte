<script lang="ts">
	import type { Variants } from 'motion-sv';
	import { motion } from 'motion-sv';

	type AnimationType = 'text' | 'word' | 'character' | 'line';
	type AnimationVariant =
		| 'fadeIn'
		| 'blurIn'
		| 'blurInUp'
		| 'blurInDown'
		| 'slideUp'
		| 'slideDown'
		| 'slideLeft'
		| 'slideRight'
		| 'scaleUp'
		| 'scaleDown';

	const staggerTimings: Record<AnimationType, number> = {
		text: 0.06,
		word: 0.05,
		character: 0.03,
		line: 0.06
	};

	const defaultContainerVariants = {
		hidden: { opacity: 1 },
		show: {
			opacity: 1,
			transition: { delayChildren: 0, staggerChildren: 0.05 }
		},
		exit: {
			opacity: 0,
			transition: { staggerChildren: 0.05, staggerDirection: -1 }
		}
	};

	const defaultItemVariants: Variants = {
		hidden: { opacity: 0 },
		show: { opacity: 1 },
		exit: { opacity: 0 }
	};

	const defaultItemAnimationVariants: Record<
		AnimationVariant,
		{ container: Variants; item: Variants }
	> = {
		fadeIn: {
			container: defaultContainerVariants,
			item: {
				hidden: { opacity: 0, y: 20 },
				show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
				exit: { opacity: 0, y: 20, transition: { duration: 0.3 } }
			}
		},
		blurIn: {
			container: defaultContainerVariants,
			item: {
				hidden: { opacity: 0, filter: 'blur(10px)' },
				show: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.3 } },
				exit: { opacity: 0, filter: 'blur(10px)', transition: { duration: 0.3 } }
			}
		},
		blurInUp: {
			container: defaultContainerVariants,
			item: {
				hidden: { opacity: 0, filter: 'blur(10px)', y: 20 },
				show: {
					opacity: 1,
					filter: 'blur(0px)',
					y: 0,
					transition: {
						y: { duration: 0.3 },
						opacity: { duration: 0.4 },
						filter: { duration: 0.3 }
					}
				},
				exit: {
					opacity: 0,
					filter: 'blur(10px)',
					y: 20,
					transition: {
						y: { duration: 0.3 },
						opacity: { duration: 0.4 },
						filter: { duration: 0.3 }
					}
				}
			}
		},
		blurInDown: {
			container: defaultContainerVariants,
			item: {
				hidden: { opacity: 0, filter: 'blur(10px)', y: -20 },
				show: {
					opacity: 1,
					filter: 'blur(0px)',
					y: 0,
					transition: {
						y: { duration: 0.3 },
						opacity: { duration: 0.4 },
						filter: { duration: 0.3 }
					}
				}
			}
		},
		slideUp: {
			container: defaultContainerVariants,
			item: {
				hidden: { y: 20, opacity: 0 },
				show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
				exit: { y: -20, opacity: 0, transition: { duration: 0.3 } }
			}
		},
		slideDown: {
			container: defaultContainerVariants,
			item: {
				hidden: { y: -20, opacity: 0 },
				show: { y: 0, opacity: 1, transition: { duration: 0.3 } },
				exit: { y: 20, opacity: 0, transition: { duration: 0.3 } }
			}
		},
		slideLeft: {
			container: defaultContainerVariants,
			item: {
				hidden: { x: 20, opacity: 0 },
				show: { x: 0, opacity: 1, transition: { duration: 0.3 } },
				exit: { x: -20, opacity: 0, transition: { duration: 0.3 } }
			}
		},
		slideRight: {
			container: defaultContainerVariants,
			item: {
				hidden: { x: -20, opacity: 0 },
				show: { x: 0, opacity: 1, transition: { duration: 0.3 } },
				exit: { x: 20, opacity: 0, transition: { duration: 0.3 } }
			}
		},
		scaleUp: {
			container: defaultContainerVariants,
			item: {
				hidden: { scale: 0.5, opacity: 0 },
				show: {
					scale: 1,
					opacity: 1,
					transition: {
						duration: 0.3,
						scale: { type: 'spring', damping: 15, stiffness: 300 }
					}
				},
				exit: { scale: 0.5, opacity: 0, transition: { duration: 0.3 } }
			}
		},
		scaleDown: {
			container: defaultContainerVariants,
			item: {
				hidden: { scale: 1.5, opacity: 0 },
				show: {
					scale: 1,
					opacity: 1,
					transition: {
						duration: 0.3,
						scale: { type: 'spring', damping: 15, stiffness: 300 }
					}
				},
				exit: { scale: 1.5, opacity: 0, transition: { duration: 0.3 } }
			}
		}
	};

	type TextAnimateProps = {
		/** The text content to animate */
		content: string;
		class?: string;
		/** The class name to be applied to each segment */
		segmentClass?: string;
		/** The delay before the animation starts, seconds */
		delay?: number;
		/** The total duration of the animation, seconds */
		duration?: number;
		/** Custom motion variants for the animation */
		variants?: Variants;
		/** How to split the text */
		by?: AnimationType;
		/** Whether to start animation when the component enters the viewport */
		startOnView?: boolean;
		/** Whether to animate only once */
		once?: boolean;
		/** The animation preset to use */
		animation?: AnimationVariant;
		/** Whether to enable accessibility features */
		accessible?: boolean;
	};

	let {
		content,
		class: className = '',
		segmentClass = '',
		delay = 0,
		duration = 0.3,
		variants,
		by = 'word',
		startOnView = true,
		once = false,
		animation = 'fadeIn',
		accessible = true
	}: TextAnimateProps = $props();

	const segments: string[] = $derived.by(() => {
		if (!content) return [];
		switch (by) {
			case 'word':
				// Keep each word's trailing whitespace inside its own segment: a
				// standalone space segment is an atomic inline-block that can land
				// at the start of a wrapped line, indenting it.
				return content.match(/\S+\s*/g) ?? [];
			case 'character':
				return content.split('');
			case 'line':
				return content.split('\n').map((line) => line.trim());
			case 'text':
			default:
				return [content];
		}
	});

	const finalVariants = $derived.by(() => {
		if (variants) {
			return {
				container: {
					hidden: { opacity: 0 },
					show: {
						opacity: 1,
						transition: {
							opacity: { duration: 0.01, delay },
							delayChildren: delay,
							staggerChildren: duration / segments.length
						}
					},
					exit: {
						opacity: 0,
						transition: {
							staggerChildren: duration / segments.length,
							staggerDirection: -1
						}
					}
				},
				item: variants
			};
		}
		if (animation) {
			return {
				container: {
					...defaultItemAnimationVariants[animation].container,
					show: {
						...defaultItemAnimationVariants[animation].container.show,
						transition: {
							delayChildren: delay,
							staggerChildren: duration / segments.length
						}
					},
					exit: {
						...defaultItemAnimationVariants[animation].container.exit,
						transition: {
							staggerChildren: duration / segments.length,
							staggerDirection: -1
						}
					}
				},
				item: defaultItemAnimationVariants[animation].item
			};
		}
		return { container: defaultContainerVariants, item: defaultItemVariants };
	});
</script>

<!-- No AnimatePresence/exit: exit animations would block unmount, which delays
     page navigation. This component only ever animates in. -->
<motion.div
	variants={finalVariants.container as Variants}
	initial="hidden"
	whileInView={startOnView ? 'show' : undefined}
	animate={startOnView ? undefined : 'show'}
	inViewOptions={{ once }}
	aria-label={accessible ? content : undefined}
	class="whitespace-pre-wrap {className}"
	><!-- The container is pre-wrap: any whitespace surviving between these blocks renders
	literally, so they must stay glued together. -->{#if accessible}<span
			class="sr-only">{content}</span
		>{/if}{#each segments as segment, i (i)}<motion.span
			variants={finalVariants.item}
			custom={i * staggerTimings[by]}
			class="{by === 'line' ? 'block' : 'inline-block whitespace-pre'} {segmentClass}"
			aria-hidden={accessible ? true : undefined}>{segment}</motion.span
		>{/each}</motion.div
>
