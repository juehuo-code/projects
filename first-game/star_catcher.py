"""
Star Catcher - 接星星小游戏
左右方向键移动，接住掉落的星星得分，错过3次游戏结束
"""
import tkinter as tk
import random
import math

class StarCatcher:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Star Catcher ⭐")
        self.root.resizable(False, False)

        self.W = 600
        self.H = 700
        self.canvas = tk.Canvas(self.root, width=self.W, height=self.H,
                                bg='#0a0a2e', highlightthickness=0)
        self.canvas.pack()
        self.canvas.create_rectangle(0, 0, self.W, self.H,
                                     fill='#0a0a2e', outline='')

        # 绘制背景星星
        self.bg_stars = []
        for _ in range(60):
            x = random.randint(0, self.W)
            y = random.randint(0, self.H)
            r = random.randint(1, 2)
            c = random.choice(['#ffffff', '#aaaaff', '#ffccaa'])
            s = self.canvas.create_oval(x-r, y-r, x+r, y+r, fill=c, outline='')
            self.bg_stars.append({'id': s, 'speed': random.uniform(0.3, 1.2)})

        # 玩家
        self.player_w = 80
        self.player_h = 20
        self.player_x = self.W / 2
        self.player_y = self.H - 60
        self.player_speed = 8
        self.player = self.canvas.create_rectangle(
            self.player_x - self.player_w/2,
            self.player_y - self.player_h/2,
            self.player_x + self.player_w/2,
            self.player_y + self.player_h/2,
            fill='#4dc9f6', outline='#ffffff', width=2)

        # 分数和生命
        self.score = 0
        self.lives = 3
        self.level = 1
        self.score_text = self.canvas.create_text(
            10, 10, anchor='nw',
            text=f'Score: {self.score}   Level: {self.level}   Lives: {"♥" * self.lives}',
            fill='#ffffff', font=('Consolas', 16))

        # 下落星星
        self.stars = []
        self.star_colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
                            '#ff922b', '#cc5de8', '#20c997']
        self.star_shapes = []
        self.spawn_timer = 0
        self.spawn_delay = 30

        # 粒子效果
        self.particles = []

        # 控制
        self.left_pressed = False
        self.right_pressed = False
        self.root.bind('<KeyPress-Left>', lambda e: setattr(self, 'left_pressed', True))
        self.root.bind('<KeyRelease-Left>', lambda e: setattr(self, 'left_pressed', False))
        self.root.bind('<KeyPress-Right>', lambda e: setattr(self, 'right_pressed', True))
        self.root.bind('<KeyRelease-Right>', lambda e: setattr(self, 'right_pressed', False))
        self.root.bind('<KeyPress-a>', lambda e: setattr(self, 'left_pressed', True))
        self.root.bind('<KeyRelease-a>', lambda e: setattr(self, 'left_pressed', False))
        self.root.bind('<KeyPress-d>', lambda e: setattr(self, 'right_pressed', True))
        self.root.bind('<KeyRelease-d>', lambda e: setattr(self, 'right_pressed', False))
        self.root.bind('<r>', lambda e: self.restart())
        self.root.bind('<space>', lambda e: self.restart())

        self.game_over = False
        self.game_over_text = None
        self.restart_text = None

        self.root.after(16, self.game_loop)
        self.root.mainloop()

    def create_star_shape(self, cx, cy, size, color):
        """画一个五角星"""
        points = []
        for i in range(10):
            angle = math.pi / 2 - i * math.pi / 5
            r = size if i % 2 == 0 else size * 0.38
            points.append(cx + r * math.cos(angle))
            points.append(cy - r * math.sin(angle))
        return self.canvas.create_polygon(points, fill=color, outline='#ffffff', width=1)

    def spawn_star(self):
        cx = random.randint(30, self.W - 30)
        size = random.randint(10, 18)
        color = random.choice(self.star_colors)
        star_id = self.create_star_shape(cx, -20, size, color)
        speed = random.uniform(1.5, 3.0 + self.level * 0.5)
        self.stars.append({
            'id': star_id, 'x': cx, 'y': -20.0,
            'size': size, 'speed': speed, 'color': color
        })

    def spawn_particles(self, x, y, color):
        for _ in range(12):
            angle = random.uniform(0, 2 * math.pi)
            speed = random.uniform(2, 6)
            dx = math.cos(angle) * speed
            dy = math.sin(angle) * speed
            r = random.randint(2, 4)
            p = self.canvas.create_oval(x-r, y-r, x+r, y+r, fill=color, outline='')
            self.particles.append({'id': p, 'x': x, 'y': y, 'dx': dx, 'dy': dy,
                                   'life': random.randint(10, 20), 'color': color})

    def update_particles(self):
        alive = []
        for p in self.particles:
            p['life'] -= 1
            if p['life'] <= 0:
                self.canvas.delete(p['id'])
                continue
            p['x'] += p['dx']
            p['y'] += p['dy']
            p['dy'] += 0.15
            alpha = p['life'] / 20
            self.canvas.coords(p['id'],
                               p['x'] - 2, p['y'] - 2, p['x'] + 2, p['y'] + 2)
            alive.append(p)
        self.particles = alive

    def update_bg_stars(self):
        for s in self.bg_stars:
            _, y, _, _ = self.canvas.coords(s['id'])
            y += s['speed']
            if y > self.H:
                y = -5
                x = random.randint(0, self.W)
                self.canvas.coords(s['id'], x-1, y-1, x+1, y+1)
            else:
                self.canvas.move(s['id'], 0, s['speed'])

    def game_loop(self):
        if self.game_over:
            self.root.after(16, self.game_loop)
            return

        self.update_bg_stars()
        self.update_particles()

        # 移动玩家
        if self.left_pressed:
            self.player_x -= self.player_speed
        if self.right_pressed:
            self.player_x += self.player_speed
        self.player_x = max(self.player_w/2, min(self.W - self.player_w/2, self.player_x))

        self.canvas.coords(self.player,
                           self.player_x - self.player_w/2,
                           self.player_y - self.player_h/2,
                           self.player_x + self.player_w/2,
                           self.player_y + self.player_h/2)

        # 生成星星
        self.spawn_timer += 1
        if self.spawn_timer >= max(10, self.spawn_delay - self.level * 3):
            self.spawn_timer = 0
            self.spawn_star()

        # 更新星星位置
        alive_stars = []
        for s in self.stars:
            s['y'] += s['speed']
            self.canvas.coords(s['id'],
                               s['x'] - s['size'], s['y'] - s['size'],
                               s['x'] + s['size'], s['y'] + s['size'])

            # 检查碰撞
            if (abs(s['x'] - self.player_x) < self.player_w/2 + s['size'] * 0.7 and
                abs(s['y'] - self.player_y) < self.player_h/2 + s['size'] * 0.7):
                self.score += 10 + self.level * 2
                self.spawn_particles(s['x'], s['y'], s['color'])
                self.canvas.delete(s['id'])
                # 升级
                if self.score >= self.level * 150:
                    self.level += 1
                    self.spawn_particles(self.player_x, self.player_y, '#ffffff')
                continue

            # 检查是否落出屏幕
            if s['y'] > self.H + 50:
                self.canvas.delete(s['id'])
                self.lives -= 1
                # 红色闪烁效果
                self.canvas.itemconfig(self.player, fill='#ff4444')
                self.root.after(200, lambda: self.canvas.itemconfig(
                    self.player, fill='#4dc9f6'))
                if self.lives <= 0:
                    self.end_game()
                    return
                continue

            alive_stars.append(s)
        self.stars = alive_stars

        # 更新分数显示
        self.canvas.itemconfig(self.score_text,
                               text=f'Score: {self.score}   Level: {self.level}   Lives: {"♥" * self.lives}')

        self.root.after(16, self.game_loop)

    def end_game(self):
        self.game_over = True
        self.canvas.create_rectangle(0, 0, self.W, self.H,
                                     fill='#000000', stipple='gray50',
                                     outline='')
        self.game_over_text = self.canvas.create_text(
            self.W/2, self.H/2 - 30,
            text=f'GAME OVER\nFinal Score: {self.score}   Level: {self.level}',
            fill='#ffffff', font=('Consolas', 28), justify='center')
        self.restart_text = self.canvas.create_text(
            self.W/2, self.H/2 + 60,
            text='Press R or SPACE to restart',
            fill='#ffd93d', font=('Consolas', 16))

    def restart(self):
        if not self.game_over:
            return
        self.canvas.delete('all')
        self.__init__()

if __name__ == '__main__':
    StarCatcher()
