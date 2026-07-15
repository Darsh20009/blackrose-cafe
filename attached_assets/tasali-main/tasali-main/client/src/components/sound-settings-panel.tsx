import { useState } from "react";
import { Volume2, VolumeX, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getSoundEnabled, setSoundEnabled, testSound } from "@/lib/notification-sounds";

export function SoundSettingsPanel() {
  const [posEnabled, setPosEnabled] = useState(() => getSoundEnabled('pos'));
  const [kitchenEnabled, setKitchenEnabled] = useState(() => getSoundEnabled('kitchen'));

  const togglePos = (v: boolean) => {
    setSoundEnabled('pos', v);
    setPosEnabled(v);
  };

  const toggleKitchen = (v: boolean) => {
    setSoundEnabled('kitchen', v);
    setKitchenEnabled(v);
  };

  return (
    <div className="space-y-5 py-2" dir="rtl">
      {/* POS switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {posEnabled ? (
            <Volume2 className="h-5 w-5 text-primary" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label className="text-sm font-medium block">صوت نقطة البيع</Label>
            <span className="text-xs text-muted-foreground">تنبيهات الطلبات في شاشة الكاشير</span>
          </div>
        </div>
        <Switch checked={posEnabled} onCheckedChange={togglePos} />
      </div>

      {/* Kitchen switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {kitchenEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <Label className="text-sm font-medium block">صوت المطبخ</Label>
            <span className="text-xs text-muted-foreground">تنبيهات طلبات التحضير</span>
          </div>
        </div>
        <Switch checked={kitchenEnabled} onCheckedChange={toggleKitchen} />
      </div>

      {/* Test button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => testSound('newOrder')}
      >
        <Volume2 className="ml-2 h-4 w-4" />
        اختبار الصوت
      </Button>
    </div>
  );
}
