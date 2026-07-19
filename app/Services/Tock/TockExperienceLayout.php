<?php

namespace App\Services\Tock;

class TockExperienceLayout
{
    /**
     * Add presentation state derived from the number and position of experiences.
     *
     * @param  array<int, array<string, mixed>>  $experiences
     * @return array<int, array<string, mixed>>
     */
    public function apply(array $experiences): array
    {
        $tiltedPositions = $this->tiltedPositions(count($experiences));

        foreach ($experiences as $index => &$experience) {
            $experience['is_tilted'] = in_array($index + 1, $tiltedPositions, true);
        }

        unset($experience);

        return $experiences;
    }

    /**
     * @return array<int, int>
     */
    private function tiltedPositions(int $total): array
    {
        return match (true) {
            $total < 2 => [],
            $total <= 3 => [2],
            $total === 4 => [3],
            $total === 5 => [2],
            $total <= 7 => [2, 5],
            default => [2, 5, $total - 1],
        };
    }
}
