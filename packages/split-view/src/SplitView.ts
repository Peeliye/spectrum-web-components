/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import {
    html,
    SpectrumElement,
    CSSResultArray,
    TemplateResult,
    property,
    PropertyValues,
    ifDefined,
    query,
} from '@spectrum-web-components/base';

import styles from './split-view.css.js';
import '@types/resize-observer-browser';

const CURSORS = {
    horizontal: {
        default: 'ew-resize',
        min: 'e-resize',
        max: 'w-resize',
    },
    vertical: {
        default: 'ns-resize',
        min: 's-resize',
        max: 'n-resize',
    },
};

const SPLITTERSIZE = 2;

const ARROW_KEY_CHANGE_VALUE = 10;

const PAGEUPDOWN_KEY_CHANGE_VALUE = 50;

/**
 * @element sp-split-view
 */
export class SplitView extends SpectrumElement {
    public static get styles(): CSSResultArray {
        return [styles];
    }

    @property({ type: Boolean, reflect: true })
    public vertical = false;

    @property({ type: Boolean, reflect: true })
    public resizable = false;

    /** The minimum size of the primary pane */
    @property({ type: Number, attribute: 'primary-min' })
    public primaryMin = 0;

    /** The maximum size of the primary pane */
    @property({ type: Number, attribute: 'primary-max' })
    public primaryMax = Infinity;

    /** The size of the primary pane */
    @property({ type: Number, attribute: 'primary-size' })
    public primarySize?: number;

    /** The default size of the primary pane */
    @property({ type: Number, attribute: 'primary-default' })
    public primaryDefault?: number;

    /** The minimum size of the secondary pane */
    @property({ type: Number, attribute: 'secondary-min' })
    public secondaryMin = 0;

    /** The maximum size of the secondary pane */
    @property({ type: Number, attribute: 'secondary-max' })
    public secondaryMax = Infinity;

    @property({ type: Number, attribute: false })
    public dividerPosition = 0;

    @property({ type: Number, attribute: false })
    public minPos = 0;

    @property({ type: Number, attribute: false })
    public maxPos = Infinity;

    @property({ type: Boolean, reflect: true, attribute: 'is-collapsed-start' })
    public isCollapsedStart = false;

    @property({ type: Boolean, reflect: true, attribute: 'is-collapsed-end' })
    public isCollapsedEnd = false;

    @property({ type: Boolean, reflect: true })
    public dragging = false;

    @property({ type: Boolean, reflect: true })
    public hovered = false;

    @property()
    public label?: string;

    @query('slot')
    private paneSlot!: HTMLSlotElement;

    public get size(): number {
        return this.vertical ? this.offsetHeight : this.offsetWidth;
    }

    private offset = 0;
    // private size = 0;
    private isOver = false;
    private lastPosition = 0;
    private observer: ResizeObserver;

    private rect?: DOMRect;

    public constructor() {
        super();
        this.observer = new ResizeObserver(() => {
            this.rect = undefined;
            this.resize();
        });
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this.observer.observe(this);
    }

    public disconnectedCallback(): void {
        this.observer.unobserve(this);
        super.disconnectedCallback();
    }

    protected render(): TemplateResult {
        return html`
            <slot></slot>
            <div
                id="splitter"
                role="separator"
                aria-label=${ifDefined(this.label || undefined)}
                tabindex=${ifDefined(this.resizable ? '0' : undefined)}
                @keydown=${this.onKeydown}
            >
                ${this.resizable
                    ? html`
                          <div id="gripper"></div>
                      `
                    : html``}
            </div>
        `;
    }

    private onPointermove(event: PointerEvent): void {
        this.isOver = true;
        if (this.dragging) {
            return;
        }
        this.updateCursor(event);
    }

    private onPointerdown(event: PointerEvent): void {
        if (event.button && event.button !== 0) {
            return;
        }
        if (this.primarySize !== undefined) {
            return;
        }
        if (this.hovered) {
            this.setPointerCapture(event.pointerId);
            this.onpointermove = this.onPointerdragged;
            this.dragging = true;
            this.offset = this.getOffset();
        }
    }

    private onPointerdragged(event: PointerEvent): void {
        event.preventDefault();
        let pos = this.getPosition(event) - this.offset;
        if (pos < this.minPos) {
            pos = this.minPos;
        }
        if (pos > this.maxPos) {
            pos = this.maxPos;
        }
        this.updatePosition(pos);
    }

    private onPointerup(event: PointerEvent): void {
        if (!this.dragging) {
            return;
        }
        this.releasePointerCapture(event.pointerId);
        this.onpointermove = this.onPointermove;
        this.updateCursor(event);
        this.dragging = false;
        if (!this.isOver) {
            this.style.cursor = 'default';
        }
    }

    private onPointerout(): void {
        this.isOver = false;
        this.hovered = false;
        if (!this.dragging) {
            this.style.cursor = 'default';
        }
    }

    private getOffset(): number {
        if (!this.rect) {
            this.rect = this.getBoundingClientRect();
        }
        return this.vertical ? this.rect.top : this.rect.left;
    }

    private getPosition(event: PointerEvent): number {
        return this.vertical ? event.clientY : event.clientX;
    }

    private increment(event: KeyboardEvent, offset: number): void {
        event.preventDefault();
        this.updatePosition(this.dividerPosition + offset);
    }

    private decrement(event: KeyboardEvent, offset: number): void {
        event.preventDefault();
        this.updatePosition(this.dividerPosition - offset);
    }

    private onKeydown(event: KeyboardEvent): void {
        if (!this.resizable || this.primarySize !== undefined) {
            return;
        }
        switch (event.key) {
            case 'Left':
            case 'ArrowLeft':
                this.decrement(event, ARROW_KEY_CHANGE_VALUE);
                break;
            case 'Up':
            case 'ArrowUp':
                if (this.vertical) {
                    this.decrement(event, ARROW_KEY_CHANGE_VALUE);
                } else {
                    this.increment(event, ARROW_KEY_CHANGE_VALUE);
                }
                break;
            case 'PageUp':
                if (this.vertical) {
                    this.decrement(event, PAGEUPDOWN_KEY_CHANGE_VALUE);
                } else {
                    this.increment(event, PAGEUPDOWN_KEY_CHANGE_VALUE);
                }
                break;
            case 'Right':
            case 'ArrowRight':
                this.increment(event, ARROW_KEY_CHANGE_VALUE);
                break;
            case 'Down':
            case 'ArrowDown':
                if (this.vertical) {
                    this.increment(event, ARROW_KEY_CHANGE_VALUE);
                } else {
                    this.decrement(event, ARROW_KEY_CHANGE_VALUE);
                }
                break;
            case 'PageDown':
                if (this.vertical) {
                    this.increment(event, PAGEUPDOWN_KEY_CHANGE_VALUE);
                } else {
                    this.decrement(event, PAGEUPDOWN_KEY_CHANGE_VALUE);
                }
                break;
            case 'Home':
                event.preventDefault();
                this.updatePosition(this.minPos);
                break;
            case 'End':
                event.preventDefault();
                this.updatePosition(this.maxPos);
                break;
            case 'Enter':
                event.preventDefault();
                this.updatePosition(
                    this.dividerPosition === this.minPos && this.lastPosition
                        ? this.lastPosition
                        : this.minPos
                );
                break;
        }
    }

    protected resize(): void {
        this.minPos = Math.max(this.primaryMin, this.size - this.secondaryMax);
        this.maxPos = Math.min(
            this.primaryMax,
            this.size - this.secondaryMin - this.getSplitterSize()
        );
        this.updatePosition(this.dividerPosition);
    }

    private updatePosition(x: number): void {
        this.lastPosition = this.dividerPosition;
        let pos = Math.max(this.minPos, Math.min(this.maxPos, x));
        if (x < this.minPos) {
            pos = this.minPos;
        }
        if (x > this.maxPos) {
            pos = this.maxPos;
        }
        if (pos !== this.dividerPosition) {
            this.dividerPosition = pos;
        }
        this.isCollapsedStart = this.dividerPosition === 0;
        this.isCollapsedEnd =
            this.dividerPosition >= this.size - this.getSplitterSize();
    }

    private updateCursor(event: PointerEvent) {
        let currentOver =
            this.dragging || this.dividerContainsPoint(this.getPosition(event));
        let wasOver = this.dragging ? false : this.hovered;
        if (!wasOver && currentOver) {
            const cursors = this.vertical
                ? CURSORS.vertical
                : CURSORS.horizontal;
            let cursor = cursors.default;
            if (this.dividerPosition <= this.minPos) {
                cursor = cursors.min;
            } else if (this.dividerPosition >= this.maxPos) {
                cursor = cursors.max;
            }
            this.hovered = this.isOver;
            this.style.cursor = cursor;
        } else if (wasOver && !currentOver) {
            this.hovered = false;
            this.style.cursor = 'default';
        }
    }

    private dividerContainsPoint(x: number) {
        x -= this.getOffset();
        let padding = 10;
        let d1 = this.dividerPosition - padding;
        let d2 = this.dividerPosition + padding;
        return x >= d1 && x <= d2;
    }

    public getSplitterSize(): number {
        const el = this.shadowRoot.querySelector('#splitter') as HTMLElement;
        return (
            Math.round(
                parseFloat(
                    window
                        .getComputedStyle(el)
                        .getPropertyValue(this.vertical ? 'height' : 'width')
                )
            ) || SPLITTERSIZE
        );
    }

    protected firstUpdated(changed: PropertyValues): void {
        super.firstUpdated(changed);

        if (this.resizable) {
            this.addEventListener('pointermove', this.onPointermove);
            this.addEventListener('pointerdown', this.onPointerdown);
            this.addEventListener('pointerup', this.onPointerup);
            this.addEventListener('pointerout', this.onPointerout);
        }
        this.dividerPosition = this.primaryDefault
            ? this.primaryDefault
            : Math.round(this.size / 2);
        this.resize();
    }

    protected updated(changed: PropertyValues): void {
        super.updated(changed);

        if (changed.has('dividerPosition')) {
            this.paneSlot.style.setProperty(
                '--spectrum-split-view-first-pane-size',
                `${this.dividerPosition}px`
            );
        }
    }
}
