<?php

namespace Tests\Unit;

use App\Services\Tock\TockExperienceLayout;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TockExperienceLayoutTest extends TestCase
{
    /**
     * @param  array<int, int>  $expectedTiltedPositions
     */
    #[DataProvider('reservationCounts')]
    public function test_it_assigns_tilts_according_to_the_number_of_reservations(
        int $total,
        array $expectedTiltedPositions,
    ): void {
        $experiences = array_map(
            fn (int $position): array => ['id' => (string) $position],
            range(1, $total),
        );

        $experiences = (new TockExperienceLayout)->apply($experiences);
        $actualTiltedPositions = [];

        foreach ($experiences as $position => $experience) {
            if ($experience['is_tilted']) {
                $actualTiltedPositions[] = $position + 1;
            }
        }

        $this->assertSame($expectedTiltedPositions, $actualTiltedPositions);
    }

    /**
     * @return array<string, array{int, array<int, int>}>
     */
    public static function reservationCounts(): array
    {
        return [
            'one reservation' => [1, []],
            'two reservations' => [2, [2]],
            'three reservations' => [3, [2]],
            'four reservations' => [4, [3]],
            'five reservations' => [5, [2]],
            'six reservations' => [6, [2, 5]],
            'seven reservations' => [7, [2, 5]],
            'eight reservations' => [8, [2, 5, 7]],
            'nine reservations' => [9, [2, 5, 8]],
            'twelve reservations' => [12, [2, 5, 11]],
        ];
    }
}
