import { directive, PropertyPart } from "lit-html";
import "@material/mwc-ripple";

// Cancel click if mouse/finger moved more than 20 pixels, probably scrolling
const cancelDistanceOnMove = 20;

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

interface LongPress extends HTMLElement {
  holdTime: number;
  bind(element: Element): void;
}
interface LongPressElement extends Element {
  longPress?: boolean;
}

const extractXY = (ev: any): [number, number] =>
  ev.touches
    ? [ev.touches[0].pageX, ev.touches[0].pageY]
    : [ev.pageX, ev.pageY];

class LongPress extends HTMLElement implements LongPress {
  public holdTime: number;
  protected ripple: any;
  protected timer: number | undefined;
  protected held: boolean;
  protected cooldownStart: boolean;
  protected cooldownEnd: boolean;
  protected startX: number;
  protected startY: number;

  constructor() {
    super();
    this.holdTime = 500;
    this.ripple = document.createElement("mwc-ripple");
    this.timer = undefined;
    this.held = false;
    this.cooldownStart = false;
    this.cooldownEnd = false;
    this.startX = 0;
    this.startY = 0;
  }

  public connectedCallback() {
    Object.assign(this.style, {
      position: "absolute",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
    });

    this.appendChild(this.ripple);
    this.ripple.primary = true;

    [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll",
    ].forEach((ev) => {
      document.addEventListener(
        ev,
        () => {
          clearTimeout(this.timer);
          this.stopAnimation();
          this.timer = undefined;
        },
        { passive: true }
      );
    });
  }

  public bind(element: LongPressElement) {
    if (element.longPress) {
      return;
    }
    element.longPress = true;

    element.addEventListener("contextmenu", (ev: Event) => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });

    const clickStart = (ev: Event) => {
      if (this.cooldownStart) {
        return;
      }
      this.held = false;
      [this.startX, this.startY] = extractXY(ev);
      this.timer = window.setTimeout(() => {
        this.startAnimation();
        this.held = true;
      }, this.holdTime);

      this.cooldownStart = true;
      window.setTimeout(() => (this.cooldownStart = false), 100);
    };

    const clickEnd = (ev: Event) => {
      const [stopX, stopY] = extractXY(ev);

      if (
        this.cooldownEnd ||
        Math.abs(this.startX - stopX) > cancelDistanceOnMove ||
        Math.abs(this.startY - stopY) > cancelDistanceOnMove
      ) {
        return;
      }
      clearTimeout(this.timer);
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        element.dispatchEvent(new Event("ha-hold"));
      } else {
        element.dispatchEvent(new Event("ha-click"));
      }
      this.cooldownEnd = true;
      window.setTimeout(() => (this.cooldownEnd = false), 100);
    };

    element.addEventListener("touchstart", clickStart, { passive: true });
    element.addEventListener("touchend", clickEnd);
    element.addEventListener("touchcancel", clickEnd);
    element.addEventListener("mousedown", clickStart, { passive: true });
    element.addEventListener("click", clickEnd);
  }

  private startAnimation() {
    Object.assign(this.style, {
      left: `${this.startX}px`,
      top: `${this.startY}px`,
      display: null,
    });
    this.ripple.disabled = false;
    this.ripple.active = true;
    this.ripple.unbounded = true;
  }

  private stopAnimation() {
    this.ripple.active = false;
    this.ripple.disabled = true;
    this.style.display = "none";
  }
}

customElements.define("long-press", LongPress);

const getLongPress = (): LongPress => {
  const body = document.body;
  if (body.querySelector("long-press")) {
    return body.querySelector("long-press") as LongPress;
  }

  const longpress = document.createElement("long-press");
  body.appendChild(longpress);

  return longpress as LongPress;
};

export const longPressBind = (element: LongPressElement) => {
  const longpress: LongPress = getLongPress();
  if (!longpress) {
    return;
  }
  longpress.bind(element);
};

export const longPress = () =>
  directive((part: PropertyPart) => {
    longPressBind(part.committer.element);
  });
